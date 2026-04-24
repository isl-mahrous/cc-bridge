export function main(argv: readonly string[]): number {
  process.stderr.write(`cc-bridge stub; args: ${argv.slice(2).join(' ')}\n`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv));
}
