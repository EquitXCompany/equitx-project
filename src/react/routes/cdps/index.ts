import * as root from "./root";
import * as show from "./show";
import * as list from "./list";
import * as newCDP from "./new";
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
      ],
    },
  ],
};
