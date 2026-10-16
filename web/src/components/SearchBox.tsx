import { useState, type FormEvent } from 'react'

type Props = {
  initialValue?: string
  onSearch: (name: string) => void
}

function SearchBox({ initialValue = '', onSearch }: Props) {
  const [value, setValue] = useState(initialValue)
  const name = value.trim()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // The button is disabled too, but Enter in the input still submits.
    if (name === '') return
    onSearch(name)
  }

  return (
    <form role="search" onSubmit={handleSubmit}>
      <label htmlFor="city">City</label>
      <input
        id="city"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="e.g. Lisbon"
        autoComplete="off"
      />
      <button type="submit" disabled={name === ''}>
        Search
      </button>
    </form>
  )
}

export default SearchBox
