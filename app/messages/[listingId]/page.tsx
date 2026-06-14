import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AppFrame } from "@/components/layout/app-frame";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/features/auth/services/current-user";
import { MarkSoldInChatButton } from "@/features/chat/components/mark-sold-in-chat-button";
import { MessageForm } from "@/features/chat/components/message-form";
import { getOrCreateConversationForListing } from "@/features/chat/services/conversations-repository";

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

  return (
    <AppFrame>
      <AppHeader
        activeView="messages"
        authLabel={sessionUser ? "Аккаунт" : "Войти"}
        authUser={sessionUser}
        authHref={sessionUser ? "/?account=1" : "/?auth=1"}
      />

      <section className="grid flex-1 gap-8 md:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex min-w-0 flex-col">
          <div className="mb-4">
            <Button asChild variant="secondary" size="sm">
              <Link href="/?view=messages">
                <ArrowLeft className="size-4" />
                Сообщения
              </Link>
            </Button>
          </div>

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
              {conversation.messages.length ? (
                conversation.messages.map((message) => {
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
                })
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  Напишите первое сообщение — шаблон отправляться не будет.
                </p>
              )}
            </div>

            <MessageForm
              conversationId={conversation.id}
              listingId={conversation.listingId}
              disabled={!listingIsActive}
            />
          </div>
        </div>

        <aside className="hidden md:block" aria-hidden="true" />
      </section>
    </AppFrame>
  );
}
