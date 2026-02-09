-- Collision report: archetype_terms duplicates per user_id + canonical_key.
select at.user_id, at.canonical_key, count(*) as n, array_agg(at.domain) as domains
from public.archetype_terms at
group by 1,2
having count(*) > 1
order by n desc;

-- Gap report: glossary_terms with no archetype match.
select gt.user_id, gt.canonical_key, gt.canonical, gt.category
from public.glossary_terms gt
left join public.archetype_terms at
  on at.user_id = gt.user_id
 and at.canonical_key = gt.canonical_key
where gt.canonical_key is not null
  and at.id is null
order by gt.created_at desc
limit 200;
