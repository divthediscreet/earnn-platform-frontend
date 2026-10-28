import { fetchLifeMomentCatalogue, type CatalogueCard } from './api'

// One shared load of the active card list. It is started early (when a My Benefits page opens) and kept for the
// session, so the bank and card pop-ups open at once instead of waiting for the network.
let pending: Promise<CatalogueCard[]> | null = null
let loaded: CatalogueCard[] | null = null

/** The card list when it has already been loaded, else null (no request is made). */
export const catalogueSnapshot = () => loaded

export function loadCatalogue(): Promise<CatalogueCard[]> {
  pending ??= fetchLifeMomentCatalogue()
    .then(response => { loaded = response.cards; return response.cards })
    .catch(reason => {
      pending = null // a failed load is retried next time
      throw reason
    })
  return pending
}
