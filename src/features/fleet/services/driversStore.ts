type Driver = {
  id: string
  name: string
  phone?: string
  email?: string
  vehicle?: string
  // other fields are ignored here
}

const KEY = 'ivos_drivers_v1'

export const driversStore = {
  load(): Driver[] {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return []
      return JSON.parse(raw) as Driver[]
    } catch (e) {
      console.error('Failed to load drivers', e)
      return []
    }
  },
  save(drivers: Driver[]) {
    try {
      localStorage.setItem(KEY, JSON.stringify(drivers))
      try { window.dispatchEvent(new Event('drivers:updated')) } catch (e) {}
    } catch (e) {
      console.error('Failed to save drivers', e)
    }
  },
  add(driver: Driver) {
    const list = this.load()
    list.push(driver)
    this.save(list)
  },
  update(driver: Driver) {
    const list = this.load().map(d => d.id === driver.id ? driver : d)
    this.save(list)
  },
  remove(id: string) {
    const list = this.load().filter(d => d.id !== id)
    this.save(list)
  },
  clear() {
    localStorage.removeItem(KEY)
  }
}
