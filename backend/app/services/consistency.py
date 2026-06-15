"""Rating consistency via cycle detection in the comparison graph."""
from __future__ import annotations

from collections import defaultdict


def build_graph(comparisons: list[dict]) -> dict[str, set[str]]:
    g: dict[str, set[str]] = defaultdict(set)
    for c in comparisons:
        g[c["winner_song_id"]].add(c["loser_song_id"])
    return dict(g)


def has_path(graph: dict[str, set[str]], start: str, end: str) -> bool:
    if start == end:
        return True
    seen = {start}
    stack = [start]
    while stack:
        node = stack.pop()
        for nxt in graph.get(node, ()):
            if nxt == end:
                return True
            if nxt not in seen:
                seen.add(nxt)
                stack.append(nxt)
    return False


def shortest_path(graph: dict[str, set[str]], start: str, end: str) -> list[str] | None:
    if start == end:
        return [start]
    prev: dict[str, str | None] = {start: None}
    queue = [start]
    head = 0
    while head < len(queue):
        node = queue[head]
        head += 1
        for nxt in graph.get(node, ()):
            if nxt not in prev:
                prev[nxt] = node
                if nxt == end:
                    path = [end]
                    cur = end
                    while prev[cur] is not None:
                        cur = prev[cur]  # type: ignore
                        path.append(cur)
                    path.reverse()
                    return path
                queue.append(nxt)
    return None


def find_cycle_from_edge(
    graph: dict[str, set[str]], winner: str, loser: str
) -> list[str] | None:
    """Cycle created by adding winner→loser when loser→…→winner already exists."""
    path = shortest_path(graph, loser, winner)
    if not path:
        return None
    return path + [loser]


def direct_reversal(comparisons: list[dict], winner: str, loser: str) -> dict | None:
    for c in comparisons:
        if c["winner_song_id"] == loser and c["loser_song_id"] == winner:
            return c
    return None


def check_paradox(
    comparisons: list[dict],
    winner_id: str,
    loser_id: str,
) -> dict | None:
    rev = direct_reversal(comparisons, winner_id, loser_id)
    if rev:
        return {
            "type": "reversal",
            "comparison_id": rev["id"],
            "chain": [winner_id, loser_id],
        }
    graph = build_graph(comparisons)
    cycle = find_cycle_from_edge(graph, winner_id, loser_id)
    if not cycle:
        return None
    return {"type": "cycle", "chain": cycle}


def comparisons_to_drop(
    comparisons: list[dict],
    winner_id: str,
    loser_id: str,
    paradox: dict,
) -> list[str]:
    if paradox["type"] == "reversal":
        return [paradox["comparison_id"]]
    chain = paradox["chain"]
    edges: list[tuple[str, str]] = [
        (chain[i], chain[i + 1]) for i in range(len(chain) - 1)
    ]
    candidates = [
        c for c in comparisons
        if (c["winner_song_id"], c["loser_song_id"]) in edges
    ]
    if not candidates:
        return []
    oldest = min(candidates, key=lambda c: c["created_at"])
    return [oldest["id"]]


def consistency_score(comparisons: list[dict]) -> dict:
    """Fraction of comparisons not participating in any cycle."""
    if not comparisons:
        return {"score": 1.0, "paradoxes": [], "total_comparisons": 0}
    graph = build_graph(comparisons)
    nodes = set(graph.keys()) | {l for vs in graph.values() for l in vs}
    paradox_edges: list[dict] = []

    def dfs(node: str, path: list[str], stack_set: set[str]):
        path.append(node)
        stack_set.add(node)
        for nxt in graph.get(node, ()):
            if nxt in stack_set:
                idx = path.index(nxt)
                cycle = path[idx:] + [nxt]
                paradox_edges.append({"chain": cycle})
            elif nxt not in path:
                dfs(nxt, path, stack_set)
        path.pop()
        stack_set.discard(node)

    for n in nodes:
        dfs(n, [], set())

    bad = len(paradox_edges)
    total = len(comparisons)
    score = max(0.0, 1.0 - bad / max(total, 1))
    return {"score": round(score, 3), "paradoxes": paradox_edges, "total_comparisons": total}
