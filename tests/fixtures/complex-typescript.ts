import React, { useState, useEffect } from 'react';
import { Router } from 'express';
import * as path from 'path';

interface Config {
  port: number;
  host: string;
}

export class ComplexExample {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }
}