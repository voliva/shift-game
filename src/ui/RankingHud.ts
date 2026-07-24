import type { Boat } from '../game/Boat'

export class RankingHud {
  private readonly root: HTMLElement
  private readonly title = document.createElement('h2')
  private readonly rows = new Map<string, HTMLDivElement>()

  constructor(root: HTMLElement) {
    this.root = root
    this.title.textContent = 'Ranking'
  }

  render(boats: Boat[]): void {
    const ranked = [...boats].sort((first, second) => second.position.y - first.position.y)
    const leader = ranked[0]
    const visibleRows = ranked.map((boat, index) => {
      let row = this.rows.get(boat.id)
      if (!row) {
        row = document.createElement('div')
        row.className = 'ranking-row'
        this.rows.set(boat.id, row)
      }
      const gap = leader.position.y - boat.position.y
      row.replaceChildren(this.createMarker(boat.color), this.createName(index, boat.name), this.createGap(index, gap))
      return row
    })
    this.root.replaceChildren(this.title, ...visibleRows)
  }

  private createMarker(color: string): HTMLSpanElement {
    const marker = document.createElement('span')
    marker.className = 'ranking-marker'
    marker.style.backgroundColor = color
    return marker
  }

  private createName(index: number, name: string): HTMLSpanElement {
    const label = document.createElement('span')
    label.textContent = `${index + 1}. ${name}`
    return label
  }

  private createGap(index: number, gap: number): HTMLSpanElement {
    const distance = document.createElement('span')
    distance.className = 'ranking-gap'
    distance.textContent = index === 0 ? 'Leader' : `${Math.round(gap)} behind`
    return distance
  }
}
