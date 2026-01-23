-- DELETE policies for glossary tables (own rows)

create policy "delete_own_glossary_terms"
on glossary_terms
for delete
using (user_id = auth.uid());

create policy "delete_own_glossary_notes"
on glossary_notes
for delete
using (user_id = auth.uid());

create policy "delete_own_glossary_occurrences"
on glossary_occurrences
for delete
using (user_id = auth.uid());

create policy "delete_own_term_candidates"
on term_candidates
for delete
using (user_id = auth.uid());
