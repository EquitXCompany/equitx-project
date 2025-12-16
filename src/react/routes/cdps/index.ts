import { type RouteObject } from "react-router-dom";
import { Root } from "./root";
import { Show } from "./show";
import { List } from "./list";
import { NewCdp, action as newCdpAction } from "./new";
import { EditCdp, action as editCdpAction } from "./edit";
import errorElement from "../error";

export default {
  Component: Root,
  children: [
    {
      errorElement,
      children: [
        {
          index: true,
          handle: { title: () => "CDP Overview" },
          Component: List,
        },
        {
          path: "new",
          handle: { title: () => "New CDP" },
          Component: NewCdp,
          action: newCdpAction,
        },
        {
          path: ":lender",
          handle: { title: ({ lender }: { lender: string }) => lender },
          Component: Show,
        },
        {
          path: ":lender/edit",
          handle: {
            title: ({ lender }: { lender: string }) => `Edit ${lender}`,
          },
          Component: EditCdp,
          action: editCdpAction,
        },
      ],
    },
  ],
} satisfies RouteObject;
