import styles from "./card.module.css";
import type { PropsWithChildren } from "react";
import { Link } from "react-router-dom";

interface Props extends PropsWithChildren {
  title: string;
  href: string;
}

export default function Card({ title, children, href }: Props) {
  return (
    <li className={styles.linkCard}>
      <Link to={href}>
        <h2 title={title}>
          <span className="truncate">{title}</span>
          <span>&rarr;</span>
        </h2>
        <p>{children}</p>
      </Link>
    </li>
  );
}
