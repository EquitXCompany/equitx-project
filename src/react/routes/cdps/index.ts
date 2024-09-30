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
        },
        {
          ...newCDP,
          path: "new",
        },
        {
          ...show,
          path: ":lender",
        },
        {
          ...editCDP,
          path: ":lender/edit",
        },
      ],
    },
  ],
};
