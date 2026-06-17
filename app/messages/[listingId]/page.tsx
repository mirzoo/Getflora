import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AppFrame } from "@/components/layout/app-frame";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/features/auth/services/current-user";
import { MarkSoldInChatButton } from "@/features/chat/components/mark-sold-in-chat-button";
import { MessageForm } from "@/features/chat/components/message-form";
import { getOrCreateConversationForListing } from "@/features/chat/services/conversations-repository";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

type MessagesPageProps = {
  params: Promise<{
    listingId: string;
  }>;
};

export default async function MessagesPage({ params }: MessagesPageProps) {
  const { listingId } = await params;
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect("/?auth=1");
  }

  const conversation = await getOrCreateConversationForListing(listingId);

  if (!conversation) {
    notFound();
  }

  const currentUserIsSeller = conversation.sellerId === sessionUser.id;
  const participant = currentUserIsSeller ? conversation.buyer : conversation.seller;
  const participantRole = currentUserIsSeller ? "покупателем" : "продавцом";
  const listingIsActive = conversation.listing.status === "ACTIVE";
  const participantName = participant?.name ?? "Покупатель";
  const participantAvatarUrl = participant?.avatarUrl ?? null;

  return (
    <AppFrame className="max-md:px-0 max-md:pb-0 max-md:pt-0">
      <div className="hidden md:block">
        <AppHeader
          activeView="messages"
          authLabel={sessionUser ? "Аккаунт" : "Войти"}
          authUser={sessionUser}
          authHref={sessionUser ? "/?account=1" : "/?auth=1"}
        />
      </div>

      <section className="flex min-h-screen flex-col bg-gf-bg-base md:hidden">
        <header className="flex items-center gap-3 border-b border-gf-border p-4">
          <Link
            className="grid size-12 shrink-0 place-items-center rounded-full bg-gf-bg-alt text-gf-text-primary"
            href="/?view=messages"
            aria-label="Вернуться к чатам"
          >
            <ArrowLeft className="size-6" />
          </Link>

          <div className="min-w-0 text-gf-body-m leading-[normal] text-gf-text-primary">
            <h1 className="truncate font-bold">{participantName}</h1>
            <p className="truncate font-normal">
              {conversation.listing.title} · {formatPrice(conversation.listing.price)}
            </p>
          </div>
        </header>

        {!listingIsActive ? (
          <p className="mx-4 mt-4 rounded-2xl bg-gf-bg-alt px-4 py-3 text-gf-body-s text-gf-text-primary">
            {conversation.listing.status === "SOLD"
              ? "Объявление уже продано и снято с публикации."
              : "Объявление больше недоступно для покупки."}
          </p>
        ) : null}

        {currentUserIsSeller && listingIsActive ? (
          <div className="mx-4 mt-4">
            <MarkSoldInChatButton conversationId={conversation.id} />
          </div>
        ) : null}

        <div className="flex flex-1 flex-col justify-end gap-3 px-4 py-6">
          {conversation.messages.length ? (
            conversation.messages.map((message) => {
              const isOwnMessage = message.senderId === sessionUser.id;
              const time = new Intl.DateTimeFormat("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
              }).format(message.createdAt);

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-end gap-2 rounded-[20px]",
                    isOwnMessage ? "justify-end" : "justify-start",
                  )}
                >
                  {!isOwnMessage ? (
                    <ChatParticipantAvatar avatarUrl={participantAvatarUrl} name={participantName} />
                  ) : null}

                  <div
                    className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-3 text-gf-body-m font-normal leading-[normal] text-gf-text-primary",
                      isOwnMessage ? "bg-gf-bg-accent-opposite" : "bg-gf-bg-alt",
                    )}
                  >
                    <p>{message.body}</p>
                    <p className="mt-1 text-right text-gf-body-xs font-normal leading-[normal] text-gf-text-secondary">
                      {time}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-gf-body-s text-gf-text-secondary">
              Напишите первое сообщение
            </p>
          )}
        </div>

        <MessageForm
          conversationId={conversation.id}
          listingId={conversation.listingId}
          disabled={!listingIsActive}
        />
      </section>

      <section className="hidden flex-1 gap-8 md:grid md:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex min-w-0 flex-col">
          <div className="mb-4">
            <Button asChild variant="secondary" size="sm">
              <Link href="/?view=messages">
                <ArrowLeft className="size-4" />
                Сообщения
              </Link>
            </Button>
          </div>

          {conversation.messages.length ? (
            <div className="flex min-h-[560px] flex-1 flex-col rounded-[24px] border border-border">
              <div className="border-b border-border p-5">
                <p className="text-sm text-muted-foreground">Чат с {participantRole}</p>
                <h1 className="mt-1 text-2xl font-bold">{participant?.name ?? "Покупатель"}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {conversation.listing.title}
                </p>
                {!listingIsActive ? (
                  <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-sm">
                    {conversation.listing.status === "SOLD"
                      ? "Объявление уже продано и снято с публикации."
                      : "Объявление больше недоступно для покупки."}
                  </p>
                ) : null}
                {currentUserIsSeller && listingIsActive ? (
                  <div className="mt-4">
                    <MarkSoldInChatButton conversationId={conversation.id} />
                  </div>
                ) : null}
              </div>

              <div className="flex flex-1 flex-col justify-end gap-3 p-5">
                {conversation.messages.map((message) => {
                  const isOwnMessage = message.senderId === sessionUser.id;

                  return (
                    <div
                      key={message.id}
                      className={
                        isOwnMessage
                          ? "ml-auto max-w-[80%] rounded-2xl bg-primary px-4 py-3 text-primary-foreground"
                          : "max-w-[80%] rounded-2xl bg-muted px-4 py-3"
                      }
                    >
                      <p>{message.body}</p>
                      <p className={isOwnMessage ? "mt-1 text-xs text-primary-foreground/80" : "mt-1 text-xs text-muted-foreground"}>
                        {message.sender.name}
                      </p>
                    </div>
                  );
                })}
              </div>

              <MessageForm
                conversationId={conversation.id}
                listingId={conversation.listingId}
                disabled={!listingIsActive}
              />
            </div>
          ) : (
            <div className="flex min-h-[560px] flex-1 items-center justify-center px-4 text-center">
              <p className="text-sm text-muted-foreground">
                Напишите первое сообщение
              </p>
            </div>
          )}
        </div>

        <aside className="hidden md:block" aria-hidden="true" />
      </section>
    </AppFrame>
  );
}

function ChatParticipantAvatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  return (
    <div className="grid size-[50px] shrink-0 place-items-center overflow-hidden rounded-full bg-gf-bg-alt text-gf-body-m font-bold text-gf-text-primary">
      {avatarUrl ? (
        <Image src={avatarUrl} alt="" width={50} height={50} className="size-full object-cover" />
      ) : (
        name.trim().charAt(0).toUpperCase() || "?"
      )}
    </div>
  );
}
