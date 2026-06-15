import Link from "next/link";

import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
} from "@/features/admin/components/admin-ui";
import { AdminSupportMessageForm } from "@/features/support/components/admin-support-message-form";
import {
  getAdminSupportConversation,
  getAdminSupportConversations,
} from "@/features/support/services/support-repository";
import { cn } from "@/lib/utils";

type AdminSupportPageProps = {
  searchParams: Promise<{
    conversation?: string;
  }>;
};

export default async function AdminSupportPage({ searchParams }: AdminSupportPageProps) {
  const params = await searchParams;
  const conversations = await getAdminSupportConversations();
  const selectedConversation = params.conversation
    ? await getAdminSupportConversation(params.conversation)
    : conversations[0] ?? null;

  return (
    <AdminPanel className="space-y-6">
      <AdminPageHeader
        eyebrow="Support"
        title="Чаты"
        description="Обращения пользователей в чат Getflora. Здесь можно отвечать от лица поддержки."
        meta={`Всего: ${conversations.length}`}
      />

      {conversations.length === 0 ? (
        <AdminEmptyState
          title="Обращений пока нет"
          description="Когда пользователь напишет в чат Getflora, диалог появится здесь."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-2">
            {conversations.map((conversation) => {
              const isActive = selectedConversation?.id === conversation.id;

              return (
                <Link
                  key={conversation.id}
                  href={`/admin/support?conversation=${conversation.id}`}
                  className={cn(
                    "block rounded-[8px] border border-gf-border bg-gf-bg-base p-4 transition hover:bg-gf-bg-alt",
                    isActive && "border-gf-text-primary bg-gf-bg-alt",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gf-text-primary">
                        {conversation.userName}
                      </p>
                      <p className="truncate text-xs text-gf-text-secondary">
                        {conversation.userEmail ?? "Без email"}
                      </p>
                    </div>
                    <AdminStatusBadge
                      label={conversation.status === "OPEN" ? "Открыт" : "Закрыт"}
                      tone={conversation.status === "OPEN" ? "danger" : "neutral"}
                    />
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-5 text-gf-text-secondary">
                    {conversation.lastMessage}
                  </p>
                  <p className="mt-2 text-xs text-gf-text-tertiary">
                    {formatAdminDate(conversation.updatedAt)}
                  </p>
                </Link>
              );
            })}
          </div>

          {selectedConversation ? (
            <div className="flex min-h-[620px] flex-col overflow-hidden rounded-[8px] border border-gf-border bg-gf-bg-base">
              <header className="border-b border-gf-border p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gf-text-primary">
                      {selectedConversation.userName}
                    </h3>
                    <p className="text-sm text-gf-text-secondary">
                      {selectedConversation.userEmail ?? "Email не указан"}
                    </p>
                  </div>
                  <AdminStatusBadge
                    label={selectedConversation.status === "OPEN" ? "Открыт" : "Закрыт"}
                    tone={selectedConversation.status === "OPEN" ? "danger" : "neutral"}
                  />
                </div>
              </header>

              <div className="flex flex-1 flex-col justify-end gap-3 bg-gf-bg-alt p-5">
                {selectedConversation.messages.length ? (
                  selectedConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.isOwn ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-5 text-gf-text-primary",
                          message.isOwn ? "bg-gf-bg-accent-opposite" : "bg-gf-bg-base",
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
                    Пользователь открыл чат, но пока ничего не написал.
                  </p>
                )}
              </div>

              <AdminSupportMessageForm conversationId={selectedConversation.id} />
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
