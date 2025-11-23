import * as root from "./root";
import * as show from "./show";
import * as list from "./list";
import * as newCDP from "./new";
import * as editCDP from "./edit";
import errorElement from "../error";

export default {
  ...root,
  children: [
    {
      errorElement,
      children: [
        {
          ...list,
          index: true,
          handle: { title: () => "CDP Overview" },
        },
        {
          ...newCDP,
          path: "new",
          handle: { title: () => "New CDP" },
        },
        {
          ...show,
          path: ":lender",
          handle: { title: ({ lender }: { lender: string }) => lender },
        },
        {
          ...editCDP,
          path: ":lender/edit",
          handle: {
            title: ({ lender }: { lender: string }) => `Edit ${lender}`,
          },
        },
      ],
    },
  ],
};
