package com.kmerhosting.sdk;

public enum VpsAction {
  START("start"),
  STOP("stop"),
  SHUTDOWN("shutdown"),
  RESTART("restart");

  private final String value;

  VpsAction(String value) { this.value = value; }

  public String value() { return value; }
}
