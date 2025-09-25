// Mock implementation of CleanCueEngine for tests
export class CleanCueEngine {
  async initialize() {
    return Promise.resolve()
  }

  async scanLibrary(paths: string[]) {
    return {
      tracksScanned: 0,
      tracksAdded: 0,
      tracksUpdated: 0,
      errors: []
    }
  }

  getAllTracks() {
    return []
  }

  async analyzeBPM(trackId: string) {
    return { id: 'job1', status: 'completed' }
  }

  async analyzeKey(trackId: string) {
    return { id: 'job2', status: 'completed' }
  }

  async analyzeEnergy(trackId: string) {
    return { id: 'job3', status: 'completed' }
  }

  async analyzeAll() {
    return { id: 'job4', status: 'completed' }
  }
}