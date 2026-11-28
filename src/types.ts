export type Review = {
  id: number
  state: string
  user: {
    login: string
  } | null
}

export type Member = {
  login: string
}
