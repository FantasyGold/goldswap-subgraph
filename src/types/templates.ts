// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.

import { Address, DataSourceTemplate } from "../../generated/MiningManager/node_modules/@graphprotocol/graph-ts";

export class Pair extends DataSourceTemplate {
  static create(address: Address): void {
    DataSourceTemplate.create("Pair", [address.toHex()]);
  }
}
