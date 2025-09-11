
// Valid imports at the start
import React from 'react';
import { useState } from 'react';

// Valid exports
export const validFunction = () => "working";

// Syntax error in the middle
const broken = function(
  // Missing closing parenthesis

// But more valid content after
export interface ValidInterface {
  field: string;
}

export default validFunction;
