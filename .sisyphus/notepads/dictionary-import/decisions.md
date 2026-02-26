Dictionary data contract decisions

- Contract shape remains `char,cangjie,quick` to stay backward compatible with existing MVP.
- Introduced non-breaking parser extension (`parseDictionaryTextWithReport`) instead of changing old API return type.
- Severity model uses `error` and `warning` only for simple UI filtering.
- Duplicate char strategy is deterministic: last row wins, with explicit warning issue code.
- Quick code auto-derivation chosen to reduce import failures from incomplete datasets.
