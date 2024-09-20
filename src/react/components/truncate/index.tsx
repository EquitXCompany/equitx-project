import { useState } from "react";
import styles from "./truncate.module.css";

export default function Truncate({
  children,
  clickToCopy = true,
}: {
  children: string;
  clickToCopy?: boolean;
}) {
  const [copy, setCopy] = useState("click to copy");
  return (
    <abbr
      title={clickToCopy ? `${children} (${copy})` : children}
      className={styles.truncate}
      onClick={() => {
        if (clickToCopy && navigator.clipboard)
          navigator.clipboard
            .writeText(children)
            .then(() => setCopy("copied!"));
      }}
    >
      {children}
    </abbr>
  );
}
