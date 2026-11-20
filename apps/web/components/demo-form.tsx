"use client";

import { useId, useRef, type ReactNode } from "react";

/**
 * A form that is a demonstration (D-33, D-38): Paddock Notes is a portfolio project, so signing up for the
 * newsletter or signing in neither stores nor sends anything. Submitting it clears the fields and opens a
 * notice that says so. Without JavaScript, the form posts to the forms route, which discards it without
 * reading it and returns with the same text.
 */
export function DemoForm({
  action,
  className,
  notice,
  children,
}: {
  action: string;
  className?: string;
  notice: { title: string; text: string; close: string };
  children: ReactNode;
}) {
  const form = useRef<HTMLFormElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return (
    <>
      <form
        ref={form}
        action={action}
        method="post"
        className={className}
        onSubmit={(event) => {
          event.preventDefault();
          form.current?.reset();
          dialog.current?.showModal();
        }}
      >
        {children}
      </form>
      <dialog ref={dialog} className="demo-dialog" data-surface="ink" aria-labelledby={titleId}>
        <form method="dialog" className="demo-dialog-body">
          <p className="demo-dialog-kicker">Paddock Notes</p>
          <h2 id={titleId} className="demo-dialog-title">
            {notice.title}
          </h2>
          <p className="demo-dialog-text">{notice.text}</p>
          <button type="submit" className="cmp-go" autoFocus>
            {notice.close}
          </button>
        </form>
      </dialog>
    </>
  );
}
