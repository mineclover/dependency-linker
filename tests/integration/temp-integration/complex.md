# Complex Document

## Lists with Links

1. First item with [external link](https://example.com)
2. Second item with [internal link](./file.md)
   - Nested [image link](./images/nested.png)
   - Another [nested external](https://nested.example.com)

## Blockquotes

> This quote contains a [quoted link](https://quoted.example.com)
> And an [internal quoted link](./quoted.md)

## Tables

| Column 1 | Column 2 |
|----------|----------|
| [Table Link 1](https://table1.example.com) | [Table Link 2](./table.md) |

## Code Blocks

```markdown
This [code link](./code.md) should not be extracted
```

Regular [text link](./text.md) should be extracted.