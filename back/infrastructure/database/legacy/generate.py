import sys

src, dst = sys.argv[1], sys.argv[2]

kept = []
for line in open(src, encoding="utf-8").read().split("\n"):
    if line.startswith("\\"):  # psql meta-commands (\restrict, \unrestrict…)
        continue
    if "CREATE EXTENSION" in line or "COMMENT ON EXTENSION" in line:
        continue
    if "search_vector tsvector GENERATED" in line:
        # Keep the column (RETURNING references it) but as a plain, unmaintained
        # tsvector — simple search never reads it, so null is fine on 9.6.
        kept.append("    search_vector tsvector,")
        continue
    if "USING gin" in line:  # trigram / tsvector GIN indexes
        continue
    if line.startswith("SET ") or line.startswith("SELECT pg_catalog.set_config"):
        continue
    if line.strip() == "AS integer":  # CREATE SEQUENCE ... AS integer is PG10+
        continue
    line = line.replace(" DEFAULT gen_random_uuid()", "")
    kept.append(line)

# Removing the last column of a table (search_vector) leaves the previous column
# with a trailing comma right before ");" — drop it so the DDL stays valid.
out = []
for i, line in enumerate(kept):
    following = next(
        (kept[j] for j in range(i + 1, len(kept)) if kept[j].strip() != ""), ""
    )
    if line.rstrip().endswith(",") and following.strip() == ");":
        line = line.rstrip()[:-1]
    out.append(line)

open(dst, "w", encoding="utf-8").write("\n".join(out))
print("wrote %s (%d lines)" % (dst, len(out)))
