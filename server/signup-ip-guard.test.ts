import { afterEach, describe, expect, it } from "vitest";
import { getSignupAccountsPerIp } from "./db/signup-ips";

describe("getSignupAccountsPerIp", () => {
  const original = process.env.SIGNUP_ACCOUNTS_PER_IP;
  afterEach(() => {
    if (original === undefined) delete process.env.SIGNUP_ACCOUNTS_PER_IP;
    else process.env.SIGNUP_ACCOUNTS_PER_IP = original;
  });

  it("defaults to one account per IP", () => {
    delete process.env.SIGNUP_ACCOUNTS_PER_IP;
    expect(getSignupAccountsPerIp()).toBe(1);
  });

  it("honours an explicit limit, and 0 disables the check", () => {
    process.env.SIGNUP_ACCOUNTS_PER_IP = "3";
    expect(getSignupAccountsPerIp()).toBe(3);
    process.env.SIGNUP_ACCOUNTS_PER_IP = "0";
    expect(getSignupAccountsPerIp()).toBe(0);
  });

  it("falls back to 1 on garbage", () => {
    process.env.SIGNUP_ACCOUNTS_PER_IP = "abc";
    expect(getSignupAccountsPerIp()).toBe(1);
  });
});
