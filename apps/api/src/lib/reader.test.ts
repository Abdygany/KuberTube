import { describe, expect, it } from "vitest";
import { isPrivateIp } from "./reader";

describe("isPrivateIp — IPv4", () => {
  it.each([
    "10.0.0.1",
    "10.255.255.255",
    "127.0.0.1",
    "127.1.2.3",
    "169.254.169.254", // AWS metadata
    "172.16.0.1",
    "172.31.255.254",
    "192.168.1.1",
    "100.64.0.1", // CGNAT
    "100.127.255.254",
    "224.0.0.1", // multicast
    "239.255.255.255",
    "0.0.0.0",
  ])("treats %s as private", (addr) => {
    expect(isPrivateIp(addr)).toBe(true);
  });

  it.each(["8.8.8.8", "1.1.1.1", "172.32.0.1", "172.15.255.254", "100.63.255.254", "100.128.0.1"])(
    "treats %s as public",
    (addr) => {
      expect(isPrivateIp(addr)).toBe(false);
    },
  );
});

describe("isPrivateIp — IPv6 (the SSRF bracket fix)", () => {
  it.each([
    "::",
    "::1", // loopback
    "fe80::1", // link-local
    "fc00::1", // ULA
    "fd00::1",
    "fd00:ec2::254", // private cloud metadata pattern
    "ff00::1", // multicast
    "64:ff9b::1", // NAT64
    "::ffff:127.0.0.1", // IPv4-mapped loopback
    "::ffff:10.0.0.1", // IPv4-mapped private
    "::FFFF:127.0.0.1", // case-insensitive
  ])("treats %s as private", (addr) => {
    expect(isPrivateIp(addr)).toBe(true);
  });

  it.each(["2001:4860:4860::8888", "2606:4700:4700::1111", "::ffff:8.8.8.8"])(
    "treats %s as public",
    (addr) => {
      expect(isPrivateIp(addr)).toBe(false);
    },
  );
});

describe("isPrivateIp — non-IP input", () => {
  it("returns false for hostnames (caller should still DNS-resolve)", () => {
    expect(isPrivateIp("example.com")).toBe(false);
    expect(isPrivateIp("not an ip")).toBe(false);
  });
});
