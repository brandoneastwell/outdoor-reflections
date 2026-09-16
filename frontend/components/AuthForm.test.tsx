import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AuthForm from "./AuthForm";

const loginMock = vi.fn();
const createAccountMock = vi.fn();
const loginWithProviderMock = vi.fn();
const syncPendingEntriesMock = vi.fn();
const replaceMock = vi.fn();

vi.mock("@/components/DrawIcon", () => ({
  default: () => <svg data-testid="draw-icon" />,
}));

vi.mock("@/lib/context/auth", () => ({
  useAuth: () => ({
    login: loginMock,
    createAccount: createAccountMock,
    loginWithProvider: loginWithProviderMock,
    syncPendingEntries: syncPendingEntriesMock,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

function SignUpForm() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  return (
    <AuthForm
      isSigningIn={isSigningIn}
      setIsSigningIn={setIsSigningIn}
    />
  );
}

describe("AuthForm", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    loginMock.mockReset();
    createAccountMock.mockReset();
    loginWithProviderMock.mockReset();
    syncPendingEntriesMock.mockReset();
    replaceMock.mockReset();
    syncPendingEntriesMock.mockResolvedValue(undefined);
  });

  it("renders the sign-in fields and relevant actions", () => {
    render(<AuthForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    expect(screen.queryByText(/remember me/i)).not.toBeInTheDocument();
  });

  it("rejects passwords shorter than 7 characters before calling login", async () => {
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "123456");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText(/password must be over 6 characters/i),
    ).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("signs in, syncs for the new user, and navigates to entries", async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValue({ message: "Successfully logged in", id: 42 });

    render(<AuthForm />);

    await user.type(screen.getByLabelText(/email/i), "  test@example.com  ");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(syncPendingEntriesMock).toHaveBeenCalledWith(42);
      expect(replaceMock).toHaveBeenCalledWith("/entries");
    });
  });

  it("moves a successful registration into sign-in without redirecting", async () => {
    const user = userEvent.setup();
    createAccountMock.mockResolvedValue({
      message: "Successfully registered",
      id: 42,
    });

    render(<SignUpForm />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText(/successfully registered.*now sign in/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveValue("test@example.com");
    expect(screen.getByLabelText(/password/i)).toHaveValue("");
    expect(
      screen.getByRole("button", { name: /^sign in$/i }),
    ).toBeInTheDocument();
    expect(syncPendingEntriesMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("shows an error when login fails", async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(new Error("Unable to sign in"));

    render(<AuthForm />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to sign in",
    );
  });

  it("starts the google login flow when the provider button is clicked", async () => {
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.click(
      screen.getByRole("button", { name: /continue with google/i }),
    );

    expect(loginWithProviderMock).toHaveBeenCalledWith("google");
  });
});
