import { useTheme } from "@mui/material/styles";
import { Link } from "react-router-dom";
import Truncate from "../../components/truncate";
import styles from "./card.module.css";
import type { PropsWithChildren } from "react";

interface Props extends PropsWithChildren {
  title: string;
  href: string;
}

export default function Card({ title, children, href }: Props) {
  const theme = useTheme();
  
  const cardStyles = {
    backgroundColor: theme.palette.background.paper,
    boxShadow: `inset 0 0 0 1px ${
      theme.palette.mode === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)'
    }`,
  };
  
  const linkStyles = {
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.background.paper,
  };
  
  return (
    <li className={styles.linkCard} style={cardStyles}>
      <Link to={href} style={linkStyles}>
        <h2 style={{ color: theme.palette.text.primary }}>
          {title.length < 5 ? (
            title
          ) : (
            <Truncate clickToCopy={false}>{title}</Truncate>
          )}
          <span>&rarr;</span>
        </h2>
        <div style={{ color: theme.palette.text.secondary }}>{children}</div>
      </Link>
    </li>
  );
}
