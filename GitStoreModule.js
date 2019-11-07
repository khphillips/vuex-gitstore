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
            return{err: null, data: null}
    	},
        loadRepo : ({commit}, payload) =>{
            if (payload.repo != null){
                console.log('loading')
                return new Promise ((resolve, reject) => {
                    var err = GitStore.loadRepo(payload.repo).then(function(err){
                        if (err){
                            resolve(err);
                        }else{
                            commit('commitRepo', payload);
                            resolve();
                        }
                    })
                })
            }else{
                console.log('no repo')
                return{err: null, data: null}
            }
        },
        newRepo : ({commit}, payload) =>{
            console.log('new repo', payload)
            if (payload.repo != null){
                return new Promise ((resolve, reject) => {
                    var err = GitStore.newRepo(payload.repo, payload.remote_url).then(function(err){
                        if (err){
                            resolve(err);
                        }else{
                            commit('commitRepo', payload);
                            resolve();
                        }
                    })
                })
            }else{
                console.log('no repo')
                return{err: null, data: null}
            }
        },
        cloneRepo : ({commit}, payload) =>{
            console.log('cloning repo')
            if (payload.repo != null){
                return new Promise ((resolve, reject) => {
                    GitStore.cloneFromRemote(payload.repo, payload.remote_url).then(function(err){
                        if (err){
                            resolve(err);
                        }else{
                            commit('commitRepo', payload);
                            resolve();
                        }
                    })
                })
            }else{
                console.log('no repo')
                return{err: null, data: null}
            }

        },
        pullRepo : ({commit}, payload) =>{
            console.log('pulling repo')
            if (payload.remote_url){
                return new Promise ((resolve, reject) => {
                    GitStore.pullFromRemote(payload.repo, payload.remote_url).then(function(err){
                        if (err){
                            resolve(err);
                        }else{
                            commit('commitRepo', payload);
                            resolve();
                        }
                    })
                })
            }else{
                GitStore.refreshStateFromRepo()
            }
        },
        
    },
    getters: {}
}