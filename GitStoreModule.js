export default {
	namespaced: true,
    state: {
        username: null,
        email: null,
        password: null,
        persist: false,
        remote_url : null,
        repo : null,
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
            state.repo = repo;
        },
        commitRemoteUrl (state, url){
            state.remote_url = url;
        }
    },
    actions: {
    	setUser : ({commit}, payload) =>{
    		commit('commitUser', payload);
    	},
        setRepo : ({commit}, label) =>{
            commit('commitRepo', label);
        },
        setRemoteUrl : ({commit}, url) =>{
            commit('commitRemoteUrl', url);
        },
    },
    getters: {}
}