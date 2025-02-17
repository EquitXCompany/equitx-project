import styles from "./card.module.css";
import type { PropsWithChildren } from "react";
import { Link } from "react-router-dom";
import Truncate from "../../components/truncate";

interface Props extends PropsWithChildren {
  title: string;
  href: string;
}

export default function Card({ title, children, href }: Props) {
  return (
    <li className={styles.linkCard}>
      <Link to={href}>
        <h2>
          {title.length < 5 ? (
            title
          ) : (
            <Truncate clickToCopy={false}>{title}</Truncate>
          )}
          <span>&rarr;</span>
        </h2>
        <div>{children}</div>
      </Link>
    </li>
  );
}
