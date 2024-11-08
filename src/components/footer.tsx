import { BlueSkyFlutter } from "./bluesky-flutter";

export function Footer() {
  return (
    <footer className="px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center justify-center max-w-7xl mx-auto pt-4 border-t border-gray-300">
        <BlueSkyFlutter
          href="https://bsky.app/profile/nico.fyi"
          text="Made by @nico.fyi"
          className="text-blue-600"
        />
      </div>
    </footer>
  );
}
