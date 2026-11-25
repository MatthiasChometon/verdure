# Sums up sample.sh's CSV as a Markdown table: memory at the start, at the end, at its highest,
# and the busiest five seconds of CPU. Memory that ends far above where it started, run after
# run, is a leak.
NR == 2 { first = $2 }
NR > 1 {
  last = $2
  if ($2 > rss) rss = $2
  if ($3 > cpu) cpu = $3
}
END {
  print "### Processus de l'API"
  print ""
  print "| Mémoire au départ | à la fin | au plus haut | CPU au plus haut (100 % = 1 cœur) |"
  print "| --- | --- | --- | --- |"
  printf "| %d Mo | %d Mo | %d Mo | %d %% |\n", first, last, rss, cpu
}
