import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import { ContractErrors } from "../../contracts/util";

function ErrorPage() {
  const error = useRouteError();
  console.error(error);
  let message: string;
  if (isRouteErrorResponse(error)) {
    message = error.statusText;
  } else if (error instanceof Error) {
    // Check if it's a ContractError
    const contractErrorMatch = error.message.match(/Error\(Contract, #(\d+)\)/);
    if (contractErrorMatch && contractErrorMatch?.[1] !== undefined) {
      const errorCode = parseInt(contractErrorMatch[1], 10);
      const contractError = ContractErrors[errorCode as keyof typeof ContractErrors];
      message = contractError ? `Contract Error: ${contractError.message}` : error.message;
    } else {
      message = error.message;
    }
  } else {
    message = String(error);
  }

  //let errorCode = xasset.Error[num];
  return (
    <div id="error-page">
      <h1>Oops!</h1>
      <p>Sorry, an unexpected error has occurred.</p>
      <p>
        <i>{message}</i>
      </p>
    </div>
  );
}

export default <ErrorPage />;


