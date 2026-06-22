import Image from "next/image";
import Link from "next/link";

import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
} from "@/features/admin/components/admin-ui";
import { AdminDemoChatMessageForm } from "@/features/admin/components/admin-demo-chat-message-form";
import {
  getAdminDemoConversation,
  getAdminDemoConversations,
} from "@/features/admin/services/demo-chat-repository";
import { formatPrice } from "@/lib/format";
import { shouldBypassNextImageOptimizer } from "@/lib/images";
import { cn } from "@/lib/utils";

type AdminDemoChatsPageProps = {
  searchParams: Promise<{
    conversation?: string;
  }>;
};

export default async function AdminDemoChatsPage({ searchParams }: AdminDemoChatsPageProps) {
  const params = await searchParams;
  const conversations = await getAdminDemoConversations();
  const selectedConversation = params.conversation
    ? await getAdminDemoConversation(params.conversation)
    : conversations[0]
      ? await getAdminDemoConversation(conversations[0].id)
      : null;

  return (
    <AdminPanel className="space-y-6">
      <AdminPageHeader
        eyebrow="Marketplace"
        title="Витринные чаты"
        description="Диалоги по объявлениям demo-продавцов. Ответ клиенту отображается как сообщение продавца."
        meta={`Всего: ${conversations.length}`}
      />

      {conversations.length === 0 ? (
        <AdminEmptyState
          title="Диалогов пока нет"
          description="Когда покупатель откроет чат по витринному объявлению, диалог появится здесь."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
          <div className="space-y-2">
            {conversations.map((conversation) => {
              const isActive = selectedConversation?.id === conversation.id;

              return (
                <Link
                  key={conversation.id}
                  href={`/admin/demo-chats?conversation=${conversation.id}`}
                  className={cn(
                    "block rounded-[8px] border border-gf-border bg-gf-bg-base p-4 transition hover:bg-gf-bg-alt",
                    isActive && "border-gf-text-primary bg-gf-bg-alt",
                  )}
                >
                  <div className="flex gap-3">
                    {conversation.listingImageUrl ? (
                      <Image
                        src={conversation.listingImageUrl}
                        alt=""
                        width={52}
                        height={52}
                        className="size-13 rounded-[8px] object-cover"
                        unoptimized={shouldBypassNextImageOptimizer(conversation.listingImageUrl)}
                      />
                    ) : (
                      <div className="size-13 rounded-[8px] bg-gf-bg-alt" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-gf-text-primary">
                          {conversation.buyerName}
                        </p>
                        <AdminStatusBadge
                          label={conversation.listingStatus}
                          tone={conversation.listingStatus === "ACTIVE" ? "success" : "neutral"}
                        />
                      </div>
                      <p className="truncate text-xs text-gf-text-secondary">
                        {conversation.listingTitle}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-gf-text-secondary">
                        {conversation.lastSenderName ? `${conversation.lastSenderName}: ` : ""}
                        {conversation.lastMessage}
                      </p>
                      <p className="mt-2 text-xs text-gf-text-tertiary">
                        {formatAdminDate(conversation.updatedAt)}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {selectedConversation ? (
            <div className="flex min-h-[640px] flex-col overflow-hidden rounded-[8px] border border-gf-border bg-gf-bg-base">
              <header className="border-b border-gf-border p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-gf-text-secondary">
                      Клиент: {selectedConversation.buyerName}
                      {selectedConversation.buyerEmail ? ` · ${selectedConversation.buyerEmail}` : ""}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-gf-text-primary">
                      {selectedConversation.listingTitle}
                    </h3>
                    <p className="mt-1 text-sm text-gf-text-secondary">
                      Продавец: {selectedConversation.sellerName} · {formatPrice(selectedConversation.listingPrice)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <AdminStatusBadge
                      label={selectedConversation.listingStatus}
                      tone={selectedConversation.listingStatus === "ACTIVE" ? "success" : "neutral"}
                    />
                    <Link
                      href={`/admin/listings/${selectedConversation.listingId}`}
                      className="inline-flex h-8 items-center rounded-[6px] border border-gf-border px-3 text-xs font-medium transition hover:bg-gf-bg-alt"
                    >
                      Открыть объявление
                    </Link>
                  </div>
                </div>
              </header>

              <div className="flex flex-1 flex-col justify-end gap-3 overflow-y-auto bg-gf-bg-alt p-5">
                {selectedConversation.messages.length ? (
                  selectedConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn("flex", message.isSeller ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-5 text-gf-text-primary",
                          message.isSeller ? "bg-gf-bg-accent-opposite" : "bg-gf-bg-base",
                        )}
                      >
                        <p>{message.body}</p>
                        <p className="mt-1 text-right text-xs text-gf-text-secondary">
                          {message.senderName} · {formatAdminDate(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-sm text-gf-text-secondary">
                    Клиент открыл чат, но пока ничего не написал.
                  </p>
                )}
              </div>

              <AdminDemoChatMessageForm conversationId={selectedConversation.id} />
            </div>
          ) : null}
        </div>
      )}
    </AdminPanel>
  );
}

function formatAdminDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
