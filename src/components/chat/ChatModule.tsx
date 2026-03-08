import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConversationList from "./ConversationList";
import ChatThread from "./ChatThread";
import TeamChatList from "./TeamChatList";
import TeamChatThread from "./TeamChatThread";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  userId: string;
  role: "super_admin" | "admin" | "manager" | "staff";
}

export type ChatView =
  | { type: "list" }
  | { type: "dm"; conversationId: string; otherUserId: string; otherUserName: string }
  | { type: "team"; teamChatId: string; teamName: string };

const ChatModule = ({ userId, role }: Props) => {
  const [view, setView] = useState<ChatView>({ type: "list" });
  const [tab, setTab] = useState<"dm" | "team">("dm");

  const handleBack = () => setView({ type: "list" });

  if (view.type === "dm") {
    return (
      <div className="space-y-2">
        <Button variant="ghost" size="sm" className="gap-1" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <ChatThread
          userId={userId}
          conversationId={view.conversationId}
          otherUserId={view.otherUserId}
          otherUserName={view.otherUserName}
        />
      </div>
    );
  }

  if (view.type === "team") {
    return (
      <div className="space-y-2">
        <Button variant="ghost" size="sm" className="gap-1" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <TeamChatThread
          userId={userId}
          teamChatId={view.teamChatId}
          teamName={view.teamName}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Messages</h2>
      <Tabs value={tab} onValueChange={(v) => setTab(v as "dm" | "team")}>
        <TabsList className="w-full">
          <TabsTrigger value="dm" className="flex-1">Direct Messages</TabsTrigger>
          <TabsTrigger value="team" className="flex-1">Team Chats</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "dm" && (
        <ConversationList
          userId={userId}
          role={role}
          onSelect={(convId, otherUserId, otherUserName) =>
            setView({ type: "dm", conversationId: convId, otherUserId, otherUserName })
          }
        />
      )}
      {tab === "team" && (
        <TeamChatList
          userId={userId}
          role={role}
          onSelect={(teamChatId, teamName) =>
            setView({ type: "team", teamChatId, teamName })
          }
        />
      )}
    </div>
  );
};

export default ChatModule;
