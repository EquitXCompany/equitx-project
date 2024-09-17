import * as root from "./root";
import * as show from "./show";
import * as list from "./list";
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
          ...show,
          path: ":lender",
        },
      ],
    },
  ],
};
