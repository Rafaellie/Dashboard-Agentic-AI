import { Button } from "@/components/ui/button"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { SearchIcon } from "lucide-react"

export function Pattern() {
  return (
    <Button variant="outline" aria-label="Search (Command K)">
      <SearchIcon aria-hidden="true" />
      <span>Search</span>
      <KbdGroup aria-hidden="true">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>
    </Button>
  );
}