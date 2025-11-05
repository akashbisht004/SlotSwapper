import type { IUser } from "../../src/utils"
import * as express from 'express'

declare global {
  namespace Express {
    interface User extends IUser {}
  }
}

export {};