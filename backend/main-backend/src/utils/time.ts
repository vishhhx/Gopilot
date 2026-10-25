/** The IANA timezone the browser sent, or UTC when it is missing or unknown. */
export const validTimeZone = (timeZone: unknown) => {
  if (typeof timeZone === "string") {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone });
      return timeZone;
    } catch {
      /* fall through */
    }
  }
  return "UTC";
};
