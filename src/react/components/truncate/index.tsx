import { useState } from "react";
import { Box } from "@mui/material";

export default function Truncate({
  children,
  clickToCopy = true,
}: {
  children: string;
  clickToCopy?: boolean;
}) {
  const [copy, setCopy] = useState("click to copy");
  return (
    <Box
      component="abbr"
      title={clickToCopy ? `${children} (${copy})` : children}
      onClick={() => {
        if (clickToCopy && navigator.clipboard)
          navigator.clipboard
            .writeText(children)
            .then(() => setCopy("copied!"));
      }}
      sx={{
        display: "inline-block",
        width: "3.5em",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        verticalAlign: "top",
        borderBottom: "1px dotted rgb(var(--accent-light))",
        textDecoration: "none",
        cursor: "help",
      }}
    >
      {children}
    </Box>
  );
}
