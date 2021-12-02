export default function buildSearchQ<E>(
  search: { [P in keyof E]?: E[P] },
  param: any[],
  searchQ: string
) {
  let temp = searchQ;
  const keys: (keyof E)[] = Object.keys(search) as (keyof E)[];
  if (keys.length > 0) {
    const filter: string[] = [];
    for (const key of keys) {
      if (search[key] !== undefined) {
        filter.push(`${key} = ?`);
        param.push(search[key]);
      }
    }
    if (filter.length > 0) {
      temp = ` WHERE ${filter.join(' AND ')}`;
    }
  }
  return temp;
}
