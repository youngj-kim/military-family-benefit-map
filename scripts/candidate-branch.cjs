'use strict';
// Build from current main, while preserving branch ancestry for a non-force update.
async function candidateCommit(api, branch, files) {
  const main = await api('/git/ref/heads/main');
  const ref = await api('/git/ref/heads/'+branch,'GET',undefined,true);
  if (ref && ref.object.sha !== main.object.sha) {
    const comparison = await api('/compare/'+main.object.sha+'...'+ref.object.sha);
    if (comparison.total_commits > comparison.commits.length || (comparison.files || []).some(file => !Object.hasOwn(files,file.filename)) || comparison.commits.some(commit => commit.author?.login !== 'github-actions[bot]')) {
      throw Error('Review branch contains manual or unrelated changes; preserve it and review before updating.');
    }
  }
  const base = await api('/git/commits/'+main.object.sha);
  const tree = await api('/git/trees','POST',{base_tree:base.tree.sha,tree:Object.entries(files).map(([file,content]) => ({path:file,mode:'100644',type:'blob',content}))});
  const parents = [...new Set([main.object.sha,...(ref ? [ref.object.sha] : [])])];
  const next = await api('/git/commits','POST',{message:'Prepare official MMA facility data update',tree:tree.sha,parents});
  if (ref) await api('/git/refs/heads/'+branch,'PATCH',{sha:next.sha,force:false});
  else await api('/git/refs','POST',{ref:'refs/heads/'+branch,sha:next.sha});
}
module.exports = {candidateCommit};
