export type ActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialActionState: ActionState = {
  status: "idle",
  message: "",
};

export function successState(message: string): ActionState {
  return {
    status: "success",
    message,
  };
}

export function errorState(error: unknown): ActionState {
  return {
    status: "error",
    message: getActionErrorMessage(error),
  };
}

function getActionErrorMessage(error: unknown) {
  if (isPrismaKnownRequestError(error)) {
    if (error.code === "P2002") {
      return "That value already exists. Check the slug or short name and try again.";
    }

    if (error.code === "P2025") {
      return "That record could not be found. Refresh the page and try again.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function isPrismaKnownRequestError(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  );
}
