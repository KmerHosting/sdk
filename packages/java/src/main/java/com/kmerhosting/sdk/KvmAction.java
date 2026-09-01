package com.kmerhosting.sdk;

/** Supported KVM lifecycle actions. */
public enum KvmAction {
  START("start"), STOP("stop"), SHUTDOWN("shutdown"), RESTART("restart");

  private final String value;
  KvmAction(String value) { this.value = value; }
  public String value() { return value; }
}
