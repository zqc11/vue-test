<template>
  <div>
    <Header/>
    <h2>hello world</h2>
    <Footer/>
  </div>
</template>

<script>
import Header from '../../components/Header1.vue';
import Footer from '../../components/Footer1.vue';
export default {
    name: 'Login',
    components: {
        Header,
    },
    data(){
        return {
            
        };
    }
}
</script>

<style>

</style>