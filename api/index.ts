import express from "express";
import { Pool } from "pg";
import cors from "cors";
import { BskyAgent } from "@atproto/api";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import multer from 'multer';
import path from 'path';
import sharp from 'sharp'
import { BlobRefType, convertToBlueskyPost, ScheduledPostData } from "./types"
import { Image } from "@atproto/api/dist/client/types/app/bsky/embed/images";

dotenv.config({ path: "../.env" });

const app = express();
const port = 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif']; 
const allowedExtensions = ['.jpeg', '.jpg', '.png', '.gif'];
const imageLimits = {
    fileSize: 1024 * 1024,
    files: 4
};

const storage = multer.memoryStorage();

const fileFilter = (_: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    try {
      
        // Check MIME type
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error('Invalid MIME type!'));
        }

        // Check file extension
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            return cb(new Error('Invalid file extension!'));
        }
        return cb(null, true);

    } catch (error) {
        return cb(new Error('Could not process file type!'));
    }
};

const upload = multer({ storage: storage, fileFilter, limits: imageLimits });

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", async (_req, res) => {
  try {
    // Test database connection
    await pool.query("SELECT 1");

    res.json({
      status: "healthy",
      database: "connected",
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/api/auth/setup", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  // Check if credentials already exist
  const existing = await pool.query("SELECT * FROM api_auth LIMIT 1");
  if (existing.rows.length > 0) {
    return res.status(400).json({ error: "API credentials already exist" });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Store credentials
  await pool.query(
    "INSERT INTO api_auth (username, password) VALUES ($1, $2)",
    [username, hashedPassword]
  );

  res.json({ success: true });
});

async function authenticateRequest(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  // Skip auth for initial setup and cron endpoint
  if (req.path === "/api/auth/setup" || req.path === "/api/cron/check-posts") {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const base64Credentials = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString(
    "ascii"
  );
  const [username, password] = credentials.split(":");

  const result = await pool.query("SELECT * FROM api_auth LIMIT 1");
  if (result.rows.length === 0) {
    return res.status(401).json({ error: "No API credentials set" });
  }

  const storedCreds = result.rows[0];
  const passwordMatch = await bcrypt.compare(password, storedCreds.password);

  if (username !== storedCreds.username || !passwordMatch) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  next();
}

app.get("/api/auth/check", async (_req, res) => {
  const result = await pool.query("SELECT * FROM api_auth LIMIT 1");
  if (result.rows.length > 0) {
    return res.json({ exists: true });
  }
  return res.status(404).json({ exists: false });
});

// Apply middleware to all routes
app.use(authenticateRequest);

// Initialize database
async function initDB() {
  if (process.env.DEBUG && process.env.DEBUG === "true") {
    console.log(`DATABASE_URL=${process.env.DATABASE_URL}`);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      data JSONB NOT NULL,
      scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
      status TEXT NOT NULL,
      error TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      repost_dates TIMESTAMP WITH TIME ZONE ARRAY
    );

    CREATE TABLE IF NOT EXISTS reposts (
      id SERIAL PRIMARY KEY,
      status TEXT NOT NULL,
      scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
      uri TEXT NOT NULL,
      cid TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS credentials (
      id SERIAL PRIMARY KEY,
      identifier TEXT NOT NULL,
      password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_auth (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

app.post("/api/post/image", upload.single('image'), async (req, res) => {
  if (!req.file) {
      return res.status(400).send('No files uploaded or invalid file type.');
  }

  const uniqueName = `${crypto.randomUUID()}${path.extname(req.file.originalname).toLowerCase()}`;
  const finalPath = path.join("./uploads", uniqueName);
  await sharp(req.file.buffer).withMetadata().toFile(finalPath);

  res.json({
    imageName: uniqueName
  });
})

app.get("/api/post/image/:name", function (req, res) {
  const fileName = req.params.name;
  const finalPath = path.join("./uploads", fileName);
  res.sendFile(finalPath, { root: '.' });
})

app.get("/api/posts/pending", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM posts WHERE status = $1 AND scheduled_for <= NOW()",
    ["pending"]
  );
  res.json(result.rows);
});

app.get("/api/posts/scheduled", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM posts WHERE status = $1 AND scheduled_for > NOW()",
    ["pending"]
  );
  res.json(result.rows);
});

app.get("/api/posts/published", async (req, res) => {
  const result = await pool.query("SELECT * FROM posts WHERE status = $1", [
    "published",
  ]);
  res.json(result.rows);
});

app.get("/api/posts/to-send", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM posts WHERE status = $1 AND scheduled_for <= NOW()",
    ["pending"]
  );
  res.json(result.rows);
});

app.get("/api/posts", async (req, res) => {
  const result = await pool.query("SELECT * FROM posts");
  res.json(result.rows);
});

app.post("/api/posts", async (req, res) => {
  const { data, scheduledFor, repostDates } = req.body;
  const result = await pool.query(
    "INSERT INTO posts (data, scheduled_for, status, repost_dates) VALUES ($1, $2, $3, $4) RETURNING *",
    [data, scheduledFor, "pending", repostDates]
  );
  res.json(result.rows[0]);
});

app.delete("/api/posts/:id", async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM posts WHERE id = $1", [id]);
  res.json({ success: true });
});

async function getScheduledReposts(reposts: {uri: string, cid: string}[])
{
  const uris = reposts.map((val) => val.uri);
  if(uris.length == 0)
  {
    return [];
  }

  const { rows: [creds] } = await pool.query("SELECT * FROM credentials LIMIT 1");

  if(!creds)
  {
    return [];
  }

  const agent = new BskyAgent({ service: "https://bsky.social" });
  await agent.login({
    identifier: creds.identifier,
    password: creds.password,
  });

  const postsResponse = await agent.getPosts({uris});

  console.log("Found reposts: ", postsResponse.data.posts);
  
  return reposts.map((repost) => {
    return {
      postData: postsResponse.data.posts.find((post) => post.uri === repost.uri)?.record,
      ...repost
    }
  })
}

app.get("/api/reposts/scheduled", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM reposts WHERE status = $1",
    ["pending"]
  );
  res.json(await getScheduledReposts(result.rows));
});

app.get("/api/reposts/published", async (req, res) => {
  const result = await pool.query("SELECT * FROM reposts WHERE status = $1", [
    "published",
  ]);
  res.json(await getScheduledReposts(result.rows));
});

app.get("/api/reposts/to-send", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM reposts WHERE status = $1 AND scheduled_for <= NOW()",
    ["pending"]
  );
  res.json(await getScheduledReposts(result.rows));
});

app.get("/api/reposts", async (req, res) => {
  const result = await pool.query("SELECT * FROM reposts");
  res.json(await getScheduledReposts(result.rows));
});

app.post("/api/reposts", async (req, res) => {
  const { cid, uri, scheduledFor } = req.body;
  const result = await pool.query(
    "INSERT INTO reposts (cid, uri, scheduled_for, status) VALUES ($1, $2, $3, $4) RETURNING *",
    [cid, uri, scheduledFor, "pending"]
  );
  const reposts = await getScheduledReposts(result.rows);
  res.json(reposts[0]);
});

app.delete("/api/reposts/:id", async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM reposts WHERE id = $1", [id]);
  res.json({ success: true });
});

// Cron endpoint
app.post("/api/cron/check-posts", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { rows: [creds] } = await pool.query("SELECT * FROM credentials LIMIT 1");

  if(!creds)
  {
    return;
  }

  const agent = new BskyAgent({ service: "https://bsky.social" });
  await agent.login({
    identifier: creds.identifier,
    password: creds.password,
  });

  const { rows: posts } = await pool.query(
    "SELECT * FROM posts WHERE status = $1 AND scheduled_for <= NOW()",
    ["pending"]
  );

  let repostsScheduled = 0;

  for (const post of posts) {
    try {
      const postData = post.data as ScheduledPostData;
      let bskyPost = convertToBlueskyPost(postData, post.scheduled_for.toISOString());

      if(postData.embed)
      {
        let embedImages : Image[] = [];
        for(const scheduledImage of postData.embed)
        {
          const sharpImage = await sharp(`./uploads/${scheduledImage.name}`);
          const imageMetadata = await sharpImage.metadata();
          const aspectRatio = {width: imageMetadata.width, height: imageMetadata.height};

          const uint8Array = new Uint8Array(await sharpImage.toBuffer());
          const bskyImage = await agent.uploadBlob(uint8Array, {
            encoding: `image/${imageMetadata.format}`,
          });
          embedImages.push({
            image: bskyImage.data.blob,
            alt: scheduledImage.alt || "",
            aspectRatio
          })
        }
        
        bskyPost.embed = {
          $type: "app.bsky.embed.images",
          images: embedImages
        };
      }

      const postInfo = await agent.post(bskyPost);

      await pool.query("UPDATE posts SET status = $1 WHERE id = $2", [
        "published",
        post.id,
      ]);

      let repostDatesInfo = post.repost_dates as string[]|undefined;
      if(repostDatesInfo)
      {
        for(let repostDate of repostDatesInfo)
        {
          repostsScheduled++;
          await pool.query(
            "INSERT INTO reposts (cid, uri, scheduled_for, status) VALUES ($1, $2, $3, $4)",
            [postInfo.cid, postInfo.uri, repostDate, "pending"]
          );
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await pool.query(
        "UPDATE posts SET status = $1, error = $2 WHERE id = $3",
        ["failed", errorMessage, post.id]
      );

      console.error(errorMessage);
    }
  }

  const { rows: reposts } = await pool.query(
    "SELECT * FROM reposts WHERE status = $1 AND scheduled_for <= NOW()",
    ["pending"]
  );

  for (const repost of reposts) {
    try {
      await agent.repost(repost.uri, repost.cid);

      await pool.query("UPDATE reposts SET status = $1 WHERE id = $2", [
        "published",
        repost.id,
      ]);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await pool.query(
        "UPDATE reposts SET status = $1 WHERE id = $3",
        ["failed", repost.id]
      );
      console.error(errorMessage);
    }
  }

  if(posts.length > 0)
  {
    console.log(`Tried to post [${posts.length}] scheduled posts!`);
  }
  if(repostsScheduled > 0)
  {
    console.log(`Tried to schedule [${repostsScheduled}] reposts!`);
  }
  if(reposts.length > 0)
  {
    console.log(`Tried to repost ${reposts.length} scheduled reposts!`);
  }

  res.json({ success: true });
});

app.get("/api/credentials", async (req, res) => {
  const result = await pool.query("SELECT * FROM credentials LIMIT 1");
  res.json(result.rows[0]);
});

app.post("/api/credentials", async (req, res) => {
  const { identifier, password } = req.body;
  await pool.query("DELETE FROM credentials");
  await pool.query(
    "INSERT INTO credentials (identifier, password) VALUES ($1, $2)",
    [identifier, password]
  );
  res.json({ success: true });
});

app.delete("/api/credentials", async (req, res) => {
  await pool.query("DELETE FROM credentials");
  res.json({ success: true });
});

initDB().then(() => {
  app.listen(port, () => {
    console.log(`API running on port ${port}`);
  });
});