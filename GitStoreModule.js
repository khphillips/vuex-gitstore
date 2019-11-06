import GitStore from './index'

export default {
	namespaced: true,
    state: {
        name: null,
        email: null,
        persist: false,
        remote_url : null,
        repo : null,
        error : [],
        init : false,
    },
    mutations: {
    	commitUser (state, user){
    		if (typeof user.name != 'undefined'){
    			state.name = user.name;
    		}
    		if (typeof user.email != 'undefined'){
    			state.email = user.email;
    		}
    	},
        commitRepo (state, repo){
            state.repo = repo.repo;
            state.remote_url = repo.remote_url;
        },
        commitError(state, err){
            state.error = err;
        }
    },
    actions: {
    	setUser : ({commit}, payload) =>{
    		commit('commitUser', payload);
    	},
        setRepo : ({commit}, payload) =>{
            console.log('set repo payload', payload)
            if (payload.repo != null && payload.remote_url == null){
                //local repo only
                GitStore.newLocalRepo(payload.repo, function(err){
                    if (err){
                        console.log(err)
                    }else{
                        commit('commitRepo', payload);
                    }
                })
            }else if (payload.repo != null && payload.remote_url != null){
                //repo with remote
            }else{
                console.log('no repo')
            }
        },
        loadRepo : ({commit}, payload) =>{
            console.log('load repo payload', payload)
            if (payload.repo != null && payload.remote_url == null){
                //local repo only
                GitStore.loadLocalRepo(payload.repo, function(err){
                    console.log(err)
                    commit('commitRepo', payload);
                })
            }else if (payload.repo != null && payload.remote_url != null){
                //repo with remote
            }else{
                console.log('no repo')
            }
        },
        localRepo : ({commit}, payload) =>{
            console.log('local repo')
            GitStore.newLocalRepo(payload.repo, function(err){
                if (err){
                    commit('commitError', err);
                }
                console.log('comitting new local', payload)
                payload.action = 'init'
                commit('commitRepo', payload);
            })
        },
        initRepo : ({commit}, payload) =>{
            payload.action = 'pull'
            //commit('commitRepo', payload);
        },
        pullRepo : ({commit}, payload) =>{
            console.log('pulling')
            if (payload.remote_url){
                GitStore.pullFromRemote(payload.repo, payload.remote_url, function(err){
                    console.log('comitting', payload)
                    payload.action = 'init'
                    commit('commitRepo', payload);
                })
            }else{
                GitStore.refreshStateFromRepo()
            }
        },
        cloneRepo : ({commit}, payload) =>{
            console.log('cloning')
            GitStore.cloneFromRemote(payload.repo, payload.remote_url, function(err){
                commit('commitRepo', payload);
            })
        },
    },
    getters: {}
}