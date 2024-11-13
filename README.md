# Bluesky Later

A web application to schedule posts on Bluesky. There are two versions of the app: **Browser Mode** and **Self Hosted Mode**.

## Features

- Schedule posts on Bluesky.
- View scheduled posts.
- Attach an image to the post.
- A link in the post will be displayed as a [social card](https://docs.bsky.app/docs/advanced-guides/posts#website-card-embeds).
- Generate alt text for the image using OpenAI's GPT-4o-mini model. You bring your own API key and system prompt. The key will be saved in your browser's local storage.

## Browser Mode

- Completely free. You can use it now here: [https://bskylater.nico.fyi](https://bskylater.nico.fyi)
- This is the default mode of the app.
- It uses the browser's IndexedDB to store the credentials and the scheduled posts.
- **The scheduled posts will be sent to Bluesky at the scheduled time as long as the browser tab is open and you have internet connection.**
- You can deploy this app to your own GitHub Pages by simply forking this repository and add these [repository variables](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables):
  - `VITE_IMAGE_PROXY_URL`: `https://allorigins.magic.coolify.nico.fyi/raw?url=`.
  - `VITE_METADATA_FETCHER_URL`: `https://linkpreview.magic.coolify.nico.fyi/api/v1/preview?url=`.

You can set different values for these variables. Read [Website Card Embeds](#website-card-embeds) for more details.

## Self Hosted Mode

- You need a server to host the app.
- The scheduled posts will be sent to Bluesky at the scheduled time from the API server so you don't need to keep the tab open like in the browser mode.
- The scheduled posts and credentials are stored in a PostgreSQL database.
- This mode only supports single user.
- You can deploy this mode using the [docker-compose.yml file](https://github.com/nicnocquee/bluesky-later/blob/main/docker-compose.yml) provided in the repository and set the environment variables accordingly.

### Environment Variables

- `POSTGRES_USER`: The username of the PostgreSQL database.
- `POSTGRES_PASSWORD`: The password of the PostgreSQL database.
- `POSTGRES_DB`: The name of the PostgreSQL database.
- `DATABASE_URL`: The URL of the PostgreSQL database which will be used by the API server. This should be in the format `postgresql://<username>:<password>@<host>:<port>/<database>`, where the `<username>`, `<password>`, and `<database>` values must be the same as the ones used in the `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` environment variables.
- `CRON_SECRET`: A secret key that is used to authenticate the cron endpoint.
- `VITE_METADATA_FETCHER_URL`: The URL of the metadata fetcher service.
- `VITE_IMAGE_PROXY_URL`: The URL of the image proxy service.
- `VITE_API_URL`: The URL of the API server.

The docker-compose.yml file sets default values for these environment variables. **You must change them especially the `POSTGRES_PASSWORD` and `CRON_SECRET` if you want to use the app in production.**

### Components

The app has the following components:

- API server: This is the server that handles the scheduled posts and credentials. It connects to the PostgreSQL database and sends the scheduled posts to Bluesky.
- Frontend: This is the frontend of the app where user can schedule posts and view the scheduled posts. It connects to the API server to fetch the scheduled posts and credentials.
- Cron: This is a cron job that runs every minute and checks the scheduled posts by sending a request to an end point on the API server.

## Website Card Embeds

Bluesky unfortunately does not automatically generate a social card for the website when a user posts a link to a website via the API. The application needs to generate the social card manually. In this app, it uses the service specified in the `VITE_METADATA_FETCHER_URL` environment variable to fetch the metadata of the website. And for the image of the card, it uses the service specified in the `VITE_IMAGE_PROXY_URL` environment variable to fetch the image to work around the CORS issue. By default, the application uses

- [linkpreview.magic.coolify.nico.fyi](https://linkpreview.magic.coolify.nico.fyi) for the metadata fetcher. The source code of the service is available [here](https://github.com/nicnocquee/link-preview-api).
- [allorigins.magic.coolify.nico.fyi](https://allorigins.magic.coolify.nico.fyi) for the image proxy. The source code of the service is available [here](https://github.com/nicnocquee/allOrigins).

## License

MIT

## Author

[@nico.fyi](https://bsky.app/profile/nico.fyi)
