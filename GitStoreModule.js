import GitStore from './index'

export default {
	namespaced: true,
    state: {
        username: null,
        email: null,
        password: null,
        persist: false,
        remote_url : null,
        repo : 'darknote',
        error : [],
        init : false,
    },
    mutations: {
    	commitUser (state, user){
    		if (typeof user.username != 'undefined'){
    			state.username = user.username;
    		}
    		if (typeof user.email != 'undefined'){
    			state.email = user.email;
    		}
    		if (typeof user.password != 'undefined'){
    			state.password = user.password;
    		}
    	},
        commitRepo (state, repo){
            state.repo = repo.repo;
            state.remote_url = repo.remote_url;
        },
    },
    actions: {
    	setUser : ({commit}, payload) =>{
    		commit('commitUser', payload);
    	},
        setRepo : ({commit}, payload) =>{
            GitStore.setupRepo(payload.repo, payload.remote_url, function(){
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
            GitStore.pullFromRemote(payload.repo, payload.remote_url, function(){
                console.log('comitting', payload)
                payload.action = 'init'
                commit('commitRepo', payload);
            })
        },
        cloneRepo : ({commit}, payload) =>{
            console.log('cloning')
            GitStore.cloneFromRemote(payload.repo, payload.remote_url, function(){
                commit('commitRepo', payload);
            })
        },
    },
    getters: {}
}