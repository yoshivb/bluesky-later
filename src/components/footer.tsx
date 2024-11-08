import { BlueSkyFlutter } from "./bluesky-flutter";

export function Footer() {
  return (
    <footer className="px-4 sm:px-6 lg:px-8">
      <div className="flex flex-row items-center justify-end space-x-4 max-w-7xl mx-auto py-4 border-t border-gray-300">
        <BlueSkyFlutter
          href="https://bsky.app/profile/nico.fyi"
          text="Made by @nico.fyi"
          className="text-gray-500 text-sm"
        />
        <a
          href="https://github.com/nicnocquee/bluesky-scheduler"
          target="_blank"
          className="text-gray-500 text-sm"
        >
          Source code
        </a>
      </div>
    </footer>
  );
}
