import { useState } from "react";
import { AnimatedNavTabs } from "./animated-nav-tabs";
import { PublishedPosts, ScheduledPosts } from "./posts-list";

const StatefullTabs = ({
  tabs,
  onActiveTabChange,
}: {
  tabs: Array<[string, string, boolean]>;
  onActiveTabChange: (path: string) => void;
}) => {
  const renderedTabs = tabs.map((tab) => {
    return {
      path: tab[0],
      label: (
        <button
          onClick={() => {
            onActiveTabChange(tab[0]);
          }}
        >
          {tab[1]}
        </button>
      ),
      active: tab[2],
    };
  });

  return <AnimatedNavTabs tabs={renderedTabs} springy />;
};

const tabs = [
  ["Scheduled Posts", () => <ScheduledPosts />] as const,
  ["Published Posts", () => <PublishedPosts />] as const,
] as const;

export const PostsTabs = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const Page = tabs[selectedTab][1];
  if (!Page) {
    return <div>Page tab not found</div>;
  }
  const withActiveTabs = tabs.map(([path], idx) => {
    return [path as string, path as string, idx === selectedTab] as const;
  });

  return (
    <>
      <StatefullTabs
        tabs={withActiveTabs as []}
        onActiveTabChange={(path) => {
          setSelectedTab(tabs.findIndex(([p]) => p === path));
        }}
      />
      <Page />
    </>
  );
};
